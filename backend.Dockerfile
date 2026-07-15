FROM python:3.10-slim

WORKDIR /app

# Install system dependencies required for psycopg2 and other packages
RUN apt-get update && apt-get install -y libpq-dev gcc && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy everything since the backend depends on 'exercises-dataset-main' and 'data' directories
COPY . /app

EXPOSE 8000

# Set the working directory to backend so main.py runs correctly
WORKDIR /app/backend

# Render dynamically assigns the PORT environment variable. We tell uvicorn to use it.
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
