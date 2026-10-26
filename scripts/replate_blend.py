"""Second half of scripts/replate.mjs: keep the clean table photo, take only the dish from the model's picture.

Nano Banana Pro returns the scene lined up with the table photo it was given, but redraws the whole frame, and the
smooth sea and sand come back faintly posterised. So the final picture is the original table photo everywhere except
where the model actually put something new (the plate, the food and its shadow), with a soft feathered edge between.

    python3 scripts/replate_blend.py <table.jpg> <model.png> <out.jpg>
"""
import sys
from PIL import Image, ImageChops, ImageFilter

table_path, model_path, out_path = sys.argv[1:4]
model = Image.open(model_path).convert('RGB')
table = Image.open(table_path).convert('RGB').resize(model.size, Image.LANCZOS)

# where the two differ, judged on softened copies so grain and the posterising don't count
soft = lambda im: im.convert('L').filter(ImageFilter.GaussianBlur(3))
diff = ImageChops.difference(soft(table), soft(model))
mask = diff.point(lambda v: 255 if v > 14 else 0)
# fill small gaps inside the dish, reach a little past its edge, then feather the seam
w = model.size[0]
mask = mask.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.MinFilter(5))
mask = mask.filter(ImageFilter.MaxFilter(int(w * 0.012) | 1)).filter(ImageFilter.GaussianBlur(w * 0.01))

Image.composite(model, table, mask).save(out_path, quality=86, optimize=True)
print('blended ' + out_path)
