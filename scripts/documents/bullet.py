from pptx.oxml.xmlchemy import OxmlElement


def getBulletInfo(paragraph, run=None):
    """Returns the attributes of the given <a:pPr> OxmlElement
    as well as its runs font-size.

    *param: paragraph* pptx _paragraph object
    *param: run* [optional] specific _run object
    """
    pPr = paragraph._p.get_or_add_pPr()
    if run is None:
        run = paragraph.runs[0]
    p_info = {
        "marL": pPr.attrib['marL'],
        "indent": pPr.attrib['indent'],
        "level": paragraph.level,
        "fontName": run.font.name,
        "fontSize": run.font.size,
    }
    return p_info


def SubElement(parent, tagname, **kwargs):
    """Helper for Paragraph bullet Point
    """
    element = OxmlElement(tagname)
    element.attrib.update(kwargs)
    parent.append(element)
    return element


def pBullet(
    paragraph,  # paragraph object
    font,  # fontName of that needs to be applied to bullet
    marL= '171450', # '864000',
    indent= '-150000', # '-322920',
    size= '100000' # '350000'  # fontSize (in )
):
    """Bullets are set to Arial,
    actual text can be a different font
    """
    pPr = paragraph._p.get_or_add_pPr()
    # Set marL and indent attributes
    # Indent is the space between the bullet and the text.
    pPr.set('marL', marL)
    pPr.set('indent', indent)
    # Add buFont
    _ = SubElement(parent=pPr,
                   tagname="a:buSzPct",
                   val=size
                   )
    _ = SubElement(parent=pPr,
                   tagname="a:buFont",
                   typeface=font,
                   # panose="020B0604020202020204",
                   # pitchFamily="34",
                   # charset="0"
                   )
    # Add buChar
    _ = SubElement(parent=pPr,
                   tagname='a:buChar',
                   char="•"
                   )
    

def pNumber(
    paragraph,  # paragraph object
    font,  # fontName of that needs to be applied to bullet
    marL= '171450', # '864000',
    indent= '-200000', # '-322920',
    size= '100000' # '350000'  # fontSize (in )
):
    """Bullets are set to Arial,
    actual text can be a different font
    """
    pPr = paragraph._p.get_or_add_pPr()
    # Set marL and indent attributes
    # Indent is the space between the bullet and the text.
    pPr.set('marL', marL)
    pPr.set('indent', indent)
    # Add buFont
    _ = SubElement(parent=pPr,
                   tagname="a:buSzPct",
                   val=size
                   )
    _ = SubElement(parent=pPr,
                   tagname="a:buFont",
                   typeface=font,
                   # panose="020B0604020202020204",
                   # pitchFamily="34",
                   # charset="0"
                   )

    # Add buChar
    _ = SubElement(parent=pPr,
                   tagname='a:buAutoNum',
                   type='arabicPeriod'
                   )
                   