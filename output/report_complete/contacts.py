from PIL import Image,ImageDraw
from pathlib import Path
base=Path(__file__).parent
fs=sorted(base.glob('page-*.png'))
for i in range(0,len(fs),12):
    out=Image.new('RGB',(1160,1260),'#ddd');dr=ImageDraw.Draw(out)
    for j,p in enumerate(fs[i:i+12]):
        out.paste(Image.open(p).resize((280,396)),(j%4*290,j//4*420));dr.text((j%4*290,j//4*420+397),p.stem,fill='black')
    out.save(base/f'contact{i//12}.png')
