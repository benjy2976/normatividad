# Manifiestos de Kubernetes — Portal y API de Normatividad

Este directorio contiene la suite completa de manifiestos declarativos para el despliegue del portal público y backend modular de **Normatividad** (`normatividad.regionhuanuco.gob.pe`) en el clúster institucional del Gobierno Regional de Huánuco.

---

## 1. Arquitectura de Despliegue en Kubernetes

```text
                                Internet / Red Institucional
                                              │
                         ┌────────────────────▼────────────────────┐
                         │   Ingress Controller (ingress-nginx)    │
                         │   Host: normatividad.regionhuanuco.gob.pe │
                         └──────────┬───────────────────┬──────────┘
                                    │                   │
                        /resources/*│                   │/* (SPA/SSR)
                                    ▼                   ▼
                         ┌─────────────────────┐ ┌──────────────────────┐
                         │ normatividad-backend│ │normatividad-frontend │
                         │ (Service: Port 8000)│ │(Service: Port 3000)  │
                         └──────────┬──────────┘ └──────────┬───────────┘
                                    │                       │
                                    ▼                       ▼
                         ┌─────────────────────┐ ┌──────────────────────┐
                         │ Pods Laravel 13     │ │ Pods Nuxt 4 (Node 22)│
                         │ (UID:GID 33:33)     │ │ (UID:GID 1000:1000)  │
                         └──────┬──────┬───────┘ └──────────────────────┘
                                │      │
            PostgreSQL (5432)   │      │   NFS (Solo Lectura)
        ┌───────────────────────┘      └────────────────────────┐
        ▼                                                       ▼
┌─────────────────────────┐               ┌──────────────────────────────────────┐
│ Base: proyectos         │               │ - /mnt/regulations (Originales NAS)  │
│ Esquema: normatividad   │               │ - /mnt/ocr-cache (ocr-shared-cache)  │
│ Host: 10.0.0.60         │               └──────────────────────────────────────┘
└─────────────────────────┘
```

---

## 2. Inventario de Archivos

| Archivo | Tipo de Recurso | Descripción |
| :--- | :--- | :--- |
| `00-namespace.yaml` | `Namespace` | Declaración del namespace institucional `ocr-service`. |
| `01-secret.yaml` | `Secret` | Credenciales de base de datos (`DB_PASSWORD`) y clave criptográfica de Laravel (`APP_KEY`). |
| `01-secret.example.yaml` | `Secret (Plantilla)` | Plantilla sin credenciales para control de versiones. |
| `02-configmap.yaml` | `ConfigMap` | Variables de configuración para backend (`DB_HOST`, rutas de almacenamiento NFS) y frontend. |
| `03-storage-regulations.yaml` | `PV` y `PVC` | PersistentVolume y Claim para el NFS de resoluciones originales (`10.0.0.31:/mnt/iscsi/regulations`). |
| `04-deployment-backend.yaml` | `Deployment` | Despliegue de Laravel 13 (2 réplicas, UID `33:33`, montajes NFS en solo lectura, probes `/up`). |
| `05-service-backend.yaml` | `Service` | Servicio ClusterIP interno en puerto `8000`. |
| `06-deployment-frontend.yaml` | `Deployment` | Despliegue de Nuxt 4 (2 réplicas, puerto `3000`, probes `/`). |
| `07-service-frontend.yaml` | `Service` | Servicio ClusterIP interno en puerto `3000`. |
| `08-ingress.yaml` | `Ingress` | Reglas de enrutamiento: `/resources/*` hacia backend (con rewrite) y `/` hacia frontend. |
| `kustomization.yaml` | `Kustomization` | Agrupador para despliegue atómico con `kubectl apply -k .`. |

---

## 3. Consideraciones Críticas de Seguridad y Almacenamiento

1. **Usuario No-Root y Permisos (`33:33`):**
   - El contenedor backend se ejecuta forzadamente con UID/GID `33:33` (`www-data`). Esto garantiza que pueda leer sin restricciones los PDFs en el volumen `/mnt/regulations`, los cuales fueron generados por `munis` con permisos `700` y propiedad de `www-data`.
2. **Montaje de Almacenamiento en Solo Lectura (`readOnly: true`):**
   - Tanto el volumen de resoluciones originales (`/mnt/regulations`) como el de caché OCR (`/mnt/ocr-cache`) están configurados con `readOnly: true`. El portal de lectura no puede alterar ni borrar artefactos en disco.
3. **Persistencia Compartida (`ocr-shared-cache`):**
   - Reutiliza el PVC `ocr-shared-cache` ya activo en el namespace `ocr-service`, permitiendo al visor de Nuxt cargar directamente los artefactos OCR (`pdf-searchable`, `markdown`, `jsonl`) generados por el integrador.

---

## 4. Guía de Ejecución

```bash
# 1. Configurar secretos a partir de la plantilla
cp k8s/01-secret.example.yaml k8s/01-secret.yaml
# (Editar k8s/01-secret.yaml con APP_KEY y DB_PASSWORD reales)

# 2. Validar sintaxis de los manifiestos (dry-run)
kubectl apply -k k8s/ --dry-run=client

# 3. Aplicar todos los recursos en el clúster
kubectl apply -k k8s/

# 4. Monitorear el arranque de los pods
kubectl get pods -n ocr-service -l app.kubernetes.io/part-of=normatividad-services -w

# 5. Probar la salud de la API interna
kubectl exec -it deployment/normatividad-backend -n ocr-service -- curl -s http://localhost:8000/up

# 6. Probar el dominio público vía Ingress
curl -IL https://normatividad.regionhuanuco.gob.pe/resources/up
curl -IL https://normatividad.regionhuanuco.gob.pe/
```

