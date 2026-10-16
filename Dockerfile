# One container = .NET API (internal, 127.0.0.1:5080) + Next.js website (public $PORT).
# The website proxies /api/* to the API, so browser and API share one origin (login cookie works).
# Used by Render (Docker runtime, Dockerfile path ./Dockerfile). Environment "Demo": SQLite + demo data.

# ---------- 1) .NET API ----------
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS api
WORKDIR /src
COPY src/Moraveji.Domain/*.csproj src/Moraveji.Domain/
COPY src/Moraveji.Application/*.csproj src/Moraveji.Application/
COPY src/Moraveji.Infrastructure/*.csproj src/Moraveji.Infrastructure/
COPY src/Moraveji.Api/*.csproj src/Moraveji.Api/
RUN dotnet restore src/Moraveji.Api/Moraveji.Api.csproj
COPY src/ src/
RUN dotnet publish src/Moraveji.Api/Moraveji.Api.csproj -c Release -o /out/api --no-restore /p:UseAppHost=false

# ---------- 2) Next.js website ----------
FROM node:20-bookworm-slim AS web
WORKDIR /web
COPY web/package.json web/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY web/ ./
ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_API_URL="" \
    API_INTERNAL_URL=http://127.0.0.1:5080
# Use the bundled all-keyframe hero video/photos when they are in the repo (web/public/media).
RUN if [ -f public/media/hero-scrub-desktop.mp4 ]; then export NEXT_PUBLIC_LOCAL_MEDIA=1; fi; npm run build

# ---------- 3) Runtime ----------
FROM mcr.microsoft.com/dotnet/aspnet:9.0
COPY --from=web /usr/local/bin/node /usr/local/bin/node
WORKDIR /app
COPY --from=api /out/api ./api
COPY --from=web /web/.next/standalone ./web
COPY --from=web /web/.next/static ./web/.next/static
COPY --from=web /web/public ./web/public
COPY scripts/docker-start.sh ./start.sh
RUN sed -i "s/\r$//" ./start.sh && chmod +x ./start.sh && mkdir -p /app/data && chown -R $APP_UID /app/data

ENV ASPNETCORE_ENVIRONMENT=Demo \
    API_INTERNAL_URL=http://127.0.0.1:5080 \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production \
    PORT=10000
EXPOSE 10000
USER $APP_UID
CMD ["./start.sh"]
