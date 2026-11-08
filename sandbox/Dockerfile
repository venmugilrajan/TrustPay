FROM python:3.11-slim

# Create isolated, unprivileged sandbox user
RUN useradd -m -u 1000 sandboxuser

# Install minimal test dependencies
RUN pip install --no-cache-dir pytest==8.3.3

WORKDIR /workspace
RUN chown -R sandboxuser:sandboxuser /workspace

USER sandboxuser

# Network disabled at runtime via --network none
# Read-only root filesystem with /tmp tmpfs
ENTRYPOINT ["python", "/runner.py"]
