FROM python:3.11-slim

# Set the working directory
WORKDIR /app

# Install system dependencies required for PyMuPDF and SQLite
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install them
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Expose ports for FastAPI (8000) and Streamlit (8501)
EXPOSE 8000
EXPOSE 8501

# Ensure the start script is executable
RUN chmod +x start.sh

# Command to run when the container starts
CMD ["./start.sh"]
