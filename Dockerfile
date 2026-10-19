# One container = .NET API (internal, 127.0.0.1:5080) + Next.js website (public $PORT).
# The website proxies /api/* to the API, so browser and API share one origin (login cookie works).
# One installation per customer: database (SQLite) and uploads live in /app/data → mount a volume there.
# First start decides the content: Seed__Mode = blank | demo | content (see README).

# ---------- 1) .NET API ----------
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS api
WORKDIR /src
COPY src/SiteKit.Domain/*.csproj src/SiteKit.Domain/
COPY src/SiteKit.Application/*.csproj src/SiteKit.Application/
COPY src/SiteKit.Infrastructure/*.csproj src/SiteKit.Infrastructure/
COPY src/SiteKit.Api/*.csproj src/SiteKit.Api/
RUN dotnet restore src/SiteKit.Api/SiteKit.Api.csproj
COPY src/ src/
RUN dotnet publish src/SiteKit.Api/SiteKit.Api.csproj -c Release -o /out/api --no-restore /p:UseAppHost=false

# ---------- 2) Next.js website ----------
FROM node:20-bookworm-slim AS web
WORKDIR /web
COPY web/package.json web/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY web/ ./
ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_API_URL="" \
    API_INTERNAL_URL=http://127.0.0.1:5080
RUN npm run build

# ---------- 3) Runtime ----------
FROM mcr.microsoft.com/dotnet/aspnet:9.0
# ffmpeg: uploaded videos are re-encoded in the background into light scroll versions + a poster.
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*
COPY --from=web /usr/local/bin/node /usr/local/bin/node
WORKDIR /app
COPY --from=api /out/api ./api
COPY --from=web /web/.next/standalone ./web
COPY --from=web /web/.next/static ./web/.next/static
COPY --from=web /web/public ./web/public
COPY scripts/docker-start.sh ./start.sh
RUN sed -i "s/\r$//" ./start.sh && chmod +x ./start.sh && mkdir -p /app/data && chown -R $APP_UID /app/data

ENV ASPNETCORE_ENVIRONMENT=Hosted \
    API_INTERNAL_URL=http://127.0.0.1:5080 \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production \
    PORT=10000
VOLUME /app/data
EXPOSE 10000
USER $APP_UID
CMD ["./start.sh"]
