mod engine;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn it_works() {
        let result = engine::add(2, 2);
        assert_eq!(result, 4);
    }
}
