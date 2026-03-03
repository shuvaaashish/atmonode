# Stage 1: Build dependencies
FROM python:3.13-slim AS builder
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y gcc libpq-dev --no-install-recommends
RUN pip install --upgrade pip
COPY requirements.txt .
# We install everything into a specific folder to make copying easier
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Stage 2: Final lean image
FROM python:3.13-slim
# Install libpq (runtime library for Postgres)
RUN apt-get update && apt-get install -y libpq5 --no-install-recommends && rm -rf /var/lib/apt/lists/*

# Create user and directories
RUN useradd -m -r appuser
WORKDIR /app

# Copy ONLY the installed packages from builder
COPY --from=builder /install /usr/local
# Copy your actual code and change ownership to appuser immediately
COPY --chown=appuser:appuser . .

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Permissions must be set by ROOT before switching users
RUN mkdir -p /app/staticfiles && chown -R appuser:appuser /app/staticfiles
RUN chmod +x /app/entrypoint.prod.sh

# Switch to safe user
USER appuser

EXPOSE 8080

# Use the full path for the entrypoint
ENTRYPOINT ["/app/entrypoint.prod.sh"]