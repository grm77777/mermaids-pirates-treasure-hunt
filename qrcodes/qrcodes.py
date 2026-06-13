import qrcode

url = "https://d2bvjw591pjdha.cloudfront.net/clue?id=2"
file_name = "clue-2.png"

qrcode.make(url).save(file_name) # type: ignore