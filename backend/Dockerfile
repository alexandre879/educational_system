FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Needed for psycopg2 + builds
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
  && rm -rf /var/lib/apt/lists/*

# Install python deps first (better cache)a
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of backend code
COPY . /app


# DigitalOcean provides $PORT; fallback to 8000 locally
EXPOSE 8000

CMD ["sh", "-c", "python manage.py migrate && python manage.py collectstatic --noinput || true && gunicorn configuration.wsgi:application --bind 0.0.0.0:${PORT:-8000}"]