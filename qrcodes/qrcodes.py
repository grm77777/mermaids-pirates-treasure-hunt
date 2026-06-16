import qrcode

total_clues = 14

for clue in range(1, total_clues + 1):
    url = f"https://d2bvjw591pjdha.cloudfront.net/clue?id={clue}"
    file_name = f"clue-{clue}.png"

    qrcode.make(url).save(file_name) # type: ignore