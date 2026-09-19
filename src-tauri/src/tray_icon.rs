use tauri::image::Image;
use tauri::{AppHandle, Manager};

const ICON_SIZE: u32 = 64;
const DIGIT_WIDTH: u32 = 5;
const DIGIT_HEIGHT: u32 = 7;
const DIGIT_GAP: u32 = 2;
const ICON_MARGIN: u32 = 4;

/// Fuente de píxeles 5x7 para los dígitos 0-9: cada fila son los 5 bits
/// menos significativos de un byte (bit 4 = columna izquierda). Un 5x7
/// da formas reconocibles (6/8/9 no se confunden) incluso reducido al
/// tamaño real de un icono de bandeja.
const DIGIT_FONT: [[u8; 7]; 10] = [
    [0b01110, 0b10001, 0b10011, 0b10101, 0b11001, 0b10001, 0b01110], // 0
    [0b00100, 0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110], // 1
    [0b01110, 0b10001, 0b00001, 0b00010, 0b00100, 0b01000, 0b11111], // 2
    [0b11111, 0b00010, 0b00100, 0b00010, 0b00001, 0b10001, 0b01110], // 3
    [0b00010, 0b00110, 0b01010, 0b10010, 0b11111, 0b00010, 0b00010], // 4
    [0b11111, 0b10000, 0b11110, 0b00001, 0b00001, 0b10001, 0b01110], // 5
    [0b00110, 0b01000, 0b10000, 0b11110, 0b10001, 0b10001, 0b01110], // 6
    [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b01000, 0b01000], // 7
    [0b01110, 0b10001, 0b10001, 0b01110, 0b10001, 0b10001, 0b01110], // 8
    [0b01110, 0b10001, 0b10001, 0b01111, 0b00001, 0b00010, 0b01100], // 9
];

/// Dibuja el valor de glucosa como texto (sin fondo, sin forma alrededor)
/// para usarlo como icono de la bandeja del sistema: el color transmite
/// si está dentro/fuera de rango, igual que el fondo del widget flotante,
/// pero aquí es el propio número el que lleva el color en vez de un
/// círculo o insignia detrás.
pub fn render_value_icon(value: i32, in_range: bool) -> Image<'static> {
    let (r, g, b): (u8, u8, u8) = if in_range { (60, 210, 120) } else { (235, 80, 80) };

    let mut rgba = vec![0u8; (ICON_SIZE * ICON_SIZE * 4) as usize]; // transparente por defecto

    let digits: Vec<usize> = value
        .abs()
        .to_string()
        .chars()
        .filter_map(|c| c.to_digit(10))
        .map(|d| d as usize)
        .collect();
    let digits = if digits.is_empty() { vec![0] } else { digits };

    let digit_count = digits.len() as u32;
    let units_wide = digit_count * DIGIT_WIDTH + digit_count.saturating_sub(1) * DIGIT_GAP;
    let available_w = ICON_SIZE.saturating_sub(ICON_MARGIN * 2).max(1);
    let available_h = ICON_SIZE.saturating_sub(ICON_MARGIN * 2).max(1);
    let scale = (available_w / units_wide.max(1))
        .min(available_h / DIGIT_HEIGHT)
        .max(1);

    let text_width = units_wide * scale;
    let text_height = DIGIT_HEIGHT * scale;
    let start_x = ICON_SIZE.saturating_sub(text_width) / 2;
    let start_y = ICON_SIZE.saturating_sub(text_height) / 2;

    let mut cursor_x = start_x;
    for digit in digits {
        for (row, bits) in DIGIT_FONT[digit].iter().enumerate() {
            for col in 0..DIGIT_WIDTH {
                let is_on = (bits >> (DIGIT_WIDTH - 1 - col)) & 1 == 1;
                if !is_on {
                    continue;
                }
                for sy in 0..scale {
                    for sx in 0..scale {
                        let px = cursor_x + col * scale + sx;
                        let py = start_y + row as u32 * scale + sy;
                        set_pixel(&mut rgba, px, py, r, g, b, 255);
                    }
                }
            }
        }
        cursor_x += (DIGIT_WIDTH + DIGIT_GAP) * scale;
    }

    Image::new_owned(rgba, ICON_SIZE, ICON_SIZE)
}

fn set_pixel(rgba: &mut [u8], x: u32, y: u32, r: u8, g: u8, b: u8, a: u8) {
    if x >= ICON_SIZE || y >= ICON_SIZE {
        return;
    }
    let idx = ((y * ICON_SIZE + x) * 4) as usize;
    rgba[idx] = r;
    rgba[idx + 1] = g;
    rgba[idx + 2] = b;
    rgba[idx + 3] = a;
}

/// Comando invocado desde el frontend cada vez que llega una lectura
/// nueva (mock o Dexcom Share real) para reflejarla en el icono de la
/// bandeja, no solo en el widget flotante.
#[tauri::command]
pub fn update_tray_glucose(app: AppHandle, value: i32, in_range: bool) -> Result<(), String> {
    let tray = app.state::<tauri::tray::TrayIcon>().inner().clone();
    let icon = render_value_icon(value, in_range);
    tray.set_icon(Some(icon)).map_err(|e| e.to_string())
}
