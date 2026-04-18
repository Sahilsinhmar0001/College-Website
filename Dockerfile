FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . /app
ENV FLASK_ENV=production
ENV PORT=8000
EXPOSE 8000
CMD ["gunicorn", "wsgi:app", "-w", "4", "-b", "0.0.0.0:8000"]
