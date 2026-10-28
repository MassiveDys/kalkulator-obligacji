from PIL import Image, ImageDraw

size = 256
img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
d.rounded_rectangle([8, 8, 248, 248], radius=52, fill=(31, 78, 121, 255))
# biały wykres słupkowy
bars = [(56, 150, 34, 56), (104, 118, 34, 88), (152, 84, 34, 122)]
for x, y, w, h in bars:
    d.rounded_rectangle([x, y, x + w, y + h], radius=8, fill=(255, 255, 255, 255))
# złota moneta
d.ellipse([160, 150, 216, 206], fill=(240, 200, 92, 255), outline=(255, 255, 255, 255), width=5)
d.line([188, 164, 188, 192], fill=(31, 78, 121, 255), width=5)
d.line([178, 172, 198, 172], fill=(31, 78, 121, 255), width=5)
d.line([178, 184, 198, 184], fill=(31, 78, 121, 255), width=5)

img.save(r"D:\openbot\projects\kalkulator-obligacji\assets\icon.ico",
         sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
print("icon ok")
