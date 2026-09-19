use serde::{Deserialize, Serialize};
use std::time::Duration;

/// Identificador de aplicación fijo que usan todos los clientes no
/// oficiales de Dexcom Share (pydexcom, xDrip+, puentes a Nightscout,
/// etc.) desde que el protocolo se documentó de forma independiente hace
/// años. No es un secreto de Dexcom ni una credencial: es simplemente el
/// valor que la API espera para identificar "una app de terceros válida".
const APPLICATION_ID: &str = "d89443d2-327c-4a6f-89e5-496bbb0317db";

const REQUEST_TIMEOUT: Duration = Duration::from_secs(15);

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DexcomRegion {
    Us,
    OutsideUs,
}

impl DexcomRegion {
    fn base_url(self) -> &'static str {
        match self {
            DexcomRegion::Us => "https://share2.dexcom.com/ShareWebServices/Services",
            DexcomRegion::OutsideUs => "https://shareous1.dexcom.com/ShareWebServices/Services",
        }
    }

    pub fn parse(value: &str) -> Self {
        if value.eq_ignore_ascii_case("us") {
            DexcomRegion::Us
        } else {
            DexcomRegion::OutsideUs
        }
    }
}

#[derive(Debug, thiserror::Error)]
pub enum DexcomError {
    #[error("Error de red al contactar con Dexcom Share: {0}")]
    Network(#[from] reqwest::Error),
    #[error("Usuario o contraseña de Dexcom Share incorrectos")]
    InvalidCredentials,
    #[error("Dexcom Share no devolvió ninguna lectura reciente (¿el sensor está compartiendo datos?)")]
    NoReadings,
    #[error("Respuesta inesperada de Dexcom Share: {0}")]
    UnexpectedResponse(String),
}

#[derive(Debug, Clone, Serialize)]
pub struct GlucoseReading {
    pub value: i32,
    /// Normalizado a nuestro propio vocabulario: rising_fast | rising |
    /// flat | falling | falling_fast | unknown.
    pub trend: String,
    pub timestamp_ms: i64,
}

#[derive(Debug, Deserialize)]
struct RawGlucoseReading {
    #[serde(rename = "Value")]
    value: i32,
    #[serde(rename = "Trend")]
    trend: serde_json::Value,
    #[serde(rename = "WT")]
    wall_time: String,
}

pub struct DexcomClient {
    http: reqwest::Client,
    region: DexcomRegion,
}

impl DexcomClient {
    pub fn new(region: DexcomRegion) -> Self {
        let http = reqwest::Client::builder()
            .timeout(REQUEST_TIMEOUT)
            .build()
            .expect("no se pudo construir el cliente HTTP de Dexcom");
        Self { http, region }
    }

    /// Autentica contra Dexcom Share y devuelve un sessionId (GUID) válido
    /// durante ~24h, que debe reutilizarse entre sondeos en vez de
    /// autenticar en cada lectura.
    pub async fn authenticate(&self, username: &str, password: &str) -> Result<String, DexcomError> {
        let url = format!("{}/General/LoginPublisherAccountByName", self.region.base_url());
        let body = serde_json::json!({
            "accountName": username,
            "password": password,
            "applicationId": APPLICATION_ID,
        });

        let response = self.http.post(&url).json(&body).send().await?;
        if !response.status().is_success() {
            return Err(DexcomError::InvalidCredentials);
        }

        let session_id: String = response
            .json()
            .await
            .map_err(|e| DexcomError::UnexpectedResponse(e.to_string()))?;

        // Dexcom responde con un GUID de puros ceros (en vez de un error
        // HTTP) cuando las credenciales son incorrectas.
        if session_id.chars().all(|c| c == '0' || c == '-') {
            return Err(DexcomError::InvalidCredentials);
        }

        Ok(session_id)
    }

    pub async fn fetch_latest_reading(&self, session_id: &str) -> Result<GlucoseReading, DexcomError> {
        let url = format!(
            "{}/Publisher/ReadPublisherLatestGlucoseValues?sessionID={}&minutes=1440&maxCount=1",
            self.region.base_url(),
            session_id
        );

        let response = self.http.post(&url).send().await?;
        if !response.status().is_success() {
            return Err(DexcomError::InvalidCredentials);
        }

        let readings: Vec<RawGlucoseReading> = response
            .json()
            .await
            .map_err(|e| DexcomError::UnexpectedResponse(e.to_string()))?;

        let raw = readings.into_iter().next().ok_or(DexcomError::NoReadings)?;

        Ok(GlucoseReading {
            value: raw.value,
            trend: normalize_trend(&raw.trend),
            timestamp_ms: parse_wt_timestamp(&raw.wall_time).unwrap_or(0),
        })
    }
}

/// El campo WT llega como "Date(1690000000000)": milisegundos Unix
/// envueltos en un formato de texto heredado de una serialización .NET
/// antigua que la API nunca actualizó.
fn parse_wt_timestamp(wt: &str) -> Option<i64> {
    let start = wt.find('(')? + 1;
    let end = wt.find(')')?;
    wt.get(start..end)?.parse().ok()
}

/// La API devuelve el trend como número (1-9, ver documentación no
/// oficial del protocolo Share) en la mayoría de cuentas, pero algunas
/// respuestas antiguas lo traen como string ("Flat", "SingleUp", ...). Se
/// normaliza a un vocabulario propio para no acoplar el frontend al
/// formato crudo de Dexcom.
fn normalize_trend(raw: &serde_json::Value) -> String {
    let numeric = match raw {
        serde_json::Value::Number(n) => n.as_i64(),
        serde_json::Value::String(s) => match s.as_str() {
            "DoubleUp" => Some(1),
            "SingleUp" => Some(2),
            "FortyFiveUp" => Some(3),
            "Flat" => Some(4),
            "FortyFiveDown" => Some(5),
            "SingleDown" => Some(6),
            "DoubleDown" => Some(7),
            _ => Some(0),
        },
        _ => None,
    };

    match numeric {
        Some(1) => "rising_fast",
        Some(2) | Some(3) => "rising",
        Some(4) => "flat",
        Some(5) | Some(6) => "falling",
        Some(7) => "falling_fast",
        _ => "unknown",
    }
    .to_string()
}
