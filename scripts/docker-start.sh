#!/bin/sh
# Starts the API (internal only) and the website; the container stops if either one dies.
# The API must start inside its folder: ASP.NET Core reads appsettings*.json from the working directory.
cd /app/api
ASPNETCORE_URLS=http://127.0.0.1:5080 dotnet SiteKit.Api.dll &
API_PID=$!

cd /app/web
HOSTNAME=0.0.0.0 PORT="${PORT:-10000}" node server.js &
WEB_PID=$!

while kill -0 "$API_PID" 2>/dev/null && kill -0 "$WEB_PID" 2>/dev/null; do
  sleep 5
done
echo "API or website stopped — exiting so the platform restarts the container."
exit 1
