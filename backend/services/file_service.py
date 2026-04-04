import os
from datetime import datetime
from werkzeug.utils import secure_filename
from config import Config

def save_post_files(files):
    upload_dir = os.path.join(Config.UPLOAD_FOLDER, "posts")
    os.makedirs(upload_dir, exist_ok=True)

    saved = []

    for file in files:
        if not file or not file.filename:
            continue

        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        unique = f"{timestamp}_{filename}"

        path = os.path.join(upload_dir, unique)
        file.save(path)

        saved.append({
            "filename": filename,
            "file_url": f"/uploads/posts/{unique}"
        })

    return saved
