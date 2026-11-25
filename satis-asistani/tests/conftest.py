import os
import sys
import tempfile
from pathlib import Path

import pytest

KOK = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(KOK))
os.environ["VERITABANI"] = os.path.join(tempfile.mkdtemp(), "test.db")
os.environ["DENEME_MODU"] = "1"
os.environ["PANEL_SIFRESI"] = "test-sifre"
os.environ["GUNLUK_TANITIM_LIMITI"] = "2"
os.environ["MAIL_ADRESI"] = "info@hijyenlab.com"


@pytest.fixture(autouse=True)
def temiz_db():
    import veritabani as vt
    if os.path.exists(os.environ["VERITABANI"]):
        os.remove(os.environ["VERITABANI"])
    vt.kur()
    yield
