import glob
import re
import os

for file in glob.glob("*.jpeg"):
	num = str(re.search(r"(\d-\d)").group(1))

	os.rename(file, num + ".jpg")

