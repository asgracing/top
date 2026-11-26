"""Render the maintained Russian offer draft; requires ReportLab and a Cyrillic TTF."""
import argparse
import json
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--font', type=Path, default=Path('C:/Windows/Fonts/arial.ttf'))
    parser.add_argument('--bold-font', type=Path, default=Path('C:/Windows/Fonts/arialbd.ttf'))
    args = parser.parse_args()
    pdfmetrics.registerFont(TTFont('Offer', str(args.font)))
    pdfmetrics.registerFont(TTFont('OfferBold', str(args.bold_font)))
    source = json.loads((ROOT / 'scripts/offer-draft.json').read_text(encoding='utf-8'))
    target = ROOT / 'assets/legal/asg-racing-offer-2026-11-27.pdf'
    target.parent.mkdir(parents=True, exist_ok=True)
    body = ParagraphStyle('Body', fontName='Offer', fontSize=10, leading=14,
                          spaceAfter=6, alignment=TA_LEFT)
    heading = ParagraphStyle('Heading', parent=body, fontName='OfferBold',
                             fontSize=13, leading=18, spaceBefore=15, keepWithNext=True)
    title = ParagraphStyle('Title', parent=heading, fontSize=23, leading=29)
    story = [Paragraph('ASG RACING', heading), Paragraph('Публичная оферта', title),
             Paragraph('О предоставлении дополнительного цифрового доступа', body),
             Paragraph('ПРОЕКТ РЕДАКЦИИ ОТ 27 НОЯБРЯ 2026 ГОДА', heading),
             Paragraph(escape(source['notice']), body), Spacer(1, 8)]
    for block in source['blocks']:
        style = heading if block['kind'] == 'h2' else body
        if block['text'] == 'Уровень - Состав предложения':
            style = ParagraphStyle('TableHeading', parent=body, fontName='OfferBold', keepWithNext=True)
        story.append(Paragraph(escape(block['text']), style))

    def page(canvas, doc):
        canvas.setTitle('ASG Racing - публичная оферта (проект от 27.11.2026)')
        canvas.setAuthor('Администрация сайта ASG Racing')
        canvas.setFont('Offer', 8)
        canvas.setFillColor(colors.HexColor('#596273'))
        canvas.drawString(44, 27, 'ASG Racing | Проект от 27.11.2026 | Не применяется к оплатам')
        canvas.drawRightString(A4[0]-44, 27, str(doc.page))

    SimpleDocTemplate(str(target), pagesize=A4, leftMargin=44, rightMargin=44,
                      topMargin=38, bottomMargin=48, pageCompression=1,
                      invariant=1).build(story, onFirstPage=page, onLaterPages=page)
    print(target)


if __name__ == '__main__':
    main()
