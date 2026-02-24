
FROM python:3.12.9-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# system deps (psycopg2 needs libpq)
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
  && rm -rf /var/lib/apt/lists/*

# install python deps first (better cache)
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# copy project
COPY . /app

# make entrypoint executable
RUN chmod +x /app/entrypoint.sh

EXPOSE 8000

CMD ["sh", "/app/entrypoint.sh"]



