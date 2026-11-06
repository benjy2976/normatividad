#!/bin/sh
set -e

# Crear y asegurar directorios de trabajo en memoria y almacenamiento local
mkdir -p /tmp/laravel/views \
         /app/storage/framework/cache/data \
         /app/storage/framework/sessions \
         /app/storage/framework/views \
         /app/storage/logs \
         /app/bootstrap/cache

export VIEW_COMPILED_PATH=${VIEW_COMPILED_PATH:-/tmp/laravel/views}
export PHP_CLI_SERVER_WORKERS=${PHP_CLI_SERVER_WORKERS:-4}

cd /app/public
exec php -S 0.0.0.0:8000 ../vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php

