# Multi-stage build; runtime image runs as a non-root user.
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY MoravejiMotors.sln ./
COPY src/Moraveji.Domain/*.csproj src/Moraveji.Domain/
COPY src/Moraveji.Application/*.csproj src/Moraveji.Application/
COPY src/Moraveji.Infrastructure/*.csproj src/Moraveji.Infrastructure/
COPY src/Moraveji.Api/*.csproj src/Moraveji.Api/
RUN dotnet restore src/Moraveji.Api/Moraveji.Api.csproj
COPY src/ src/
RUN dotnet publish src/Moraveji.Api/Moraveji.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app
COPY --from=build /app .
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
USER $APP_UID
ENTRYPOINT ["dotnet", "Moraveji.Api.dll"]
