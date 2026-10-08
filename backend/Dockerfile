# Build context is the REPO ROOT (see docker-compose: context: .) so the image
# can bake in the scenarios and be self-contained for standalone `docker run`.
FROM python:3.11-slim
WORKDIR /srv
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/app ./app
COPY scenarios /scenarios
ENV SCEN_DIR=/scenarios REPORT_PATH=/tmp/report.json TWIN_TARGET=http://target-app:5000
EXPOSE 8000
CMD ["uvicorn","app.main:app","--host","0.0.0.0","--port","8000"]
