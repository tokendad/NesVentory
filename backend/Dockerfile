FROM python:3.11-slim AS builder

ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --user -r requirements.txt


FROM python:3.11-slim

# Environment variables for user/group configuration
ARG PUID=1000
ARG PGID=1000
ENV PUID=${PUID} \
    PGID=${PGID} \
    UMASK=002 \
    TZ=Etc/UTC \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install timezone data
RUN apt-get update && apt-get install -y --no-install-recommends \
    tzdata \
    && rm -rf /var/lib/apt/lists/*

# Create user and group with specified IDs
# Note: Uses -o to allow non-unique IDs if they conflict with base image
RUN groupadd -o -g ${PGID} nesventory 2>/dev/null || true && \
    useradd -o -u ${PUID} -g ${PGID} -s /bin/bash -m nesventory 2>/dev/null || true

# Copy Python packages to nesventory user's local directory
COPY --from=builder /root/.local /home/nesventory/.local
RUN chown -R nesventory:nesventory /home/nesventory/.local
ENV PATH=/home/nesventory/.local/bin:$PATH

# Copy application files and set ownership
COPY --chown=nesventory:nesventory . /app

# Switch to nesventory user
USER nesventory

EXPOSE 8001

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
