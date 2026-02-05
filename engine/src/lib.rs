mod engine;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn return_message(n: u32) -> String {
    return String::from(format!(
        "The fibonacci of {} is {}.",
        n,
        engine::fibonacci(n)
    ));
}
