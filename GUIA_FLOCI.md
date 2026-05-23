# Guía de Uso: Despliegue Local con Floci (Alternativa a AWS)

Esta guía explica cómo desplegar y probar la arquitectura serverless del Netflix Clone de forma 100% local utilizando **Floci**, un emulador local de AWS extremadamente ligero y veloz.

---

## Requisitos Previos

Asegúrate de tener instalado:
*   [Docker Desktop](https://www.docker.com/products/docker-desktop/) (debe estar iniciado).
*   [Node.js](https://nodejs.org/) (versión 18+).

---

## Paso 1: Iniciar Floci

1. Crea un archivo `docker-compose.yml` en la raíz de tu proyecto o ejecútalo directamente desde la terminal. Para simplificar, puedes levantar la imagen directamente usando Docker:

```bash
docker run -d --name netflix-aws-emulator -p 4566:4566 floci/floci:latest
```

*(Esto descargará e iniciará el emulador en el puerto `4566`)*.

---

## Paso 2: Configurar las variables de entorno de AWS

Para que las llamadas del AWS CLI, AWS SDK y CDK no se realicen a la nube real de AWS sino a tu emulador local, debes configurar estas variables en la terminal donde vas a desplegar.

### En PowerShell (Windows):
```powershell
$env:AWS_ENDPOINT_URL="http://localhost:4566"
$env:AWS_DEFAULT_REGION="us-east-1"
$env:AWS_ACCESS_KEY_ID="test"
$env:AWS_SECRET_ACCESS_KEY="test"
```

### En Bash (Linux / macOS / Git Bash):
```bash
export AWS_ENDPOINT_URL=http://localhost:4566
export AWS_DEFAULT_REGION=us-east-1
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
```

---

## Paso 3: Desplegar la Infraestructura en Floci

Para desplegar CDK apuntando a emuladores locales de AWS (como LocalStack o Floci), se suele utilizar una envoltura de CDK llamada `cdklocal`.

1. Instala `aws-cdk-local` globalmente o como devDependency:
   ```bash
   npm install -g aws-cdk-local
   ```

2. Haz el **bootstrap** en tu entorno local (una única vez):
   ```bash
   cd proyectoNetflix-infra
   cdklocal bootstrap
   ```

3. **Despliega** los recursos en el emulador:
   ```bash
   cdklocal deploy
   ```

Esto creará de forma instantánea y gratuita las 6 tablas de DynamoDB, las 17 Lambdas y el API Gateway en el emulador local.

---

## Paso 4: Probar los Endpoints

El script `test-api.js` está configurado para poder interactuar tanto con tu AWS real en la nube como con tu emulador local de Floci.

1. **Obtener el API ID local**:
   Al finalizar `cdklocal deploy`, verás una URL parecida a:
   `http://localhost:4566/restapis/kozso8oqh9/prod/_user_request_/`
   *(El ID de la API local en este caso es `kozso8oqh9`)*.

2. **Configurar el ID en el script**:
   Abre [test-api.js](file:///c:/Users/estiven.salinas/Desktop/maestria/cloud/proyectoNetflix/test-api.js) y edita la variable `LOCAL_API_ID` con tu ID de la API local:
   ```javascript
   const LOCAL_API_ID = "tu-api-id-local-aqui";
   ```

3. **Ejecutar las pruebas**:
   * **Para probar contra Floci (Local)**:
     ```bash
     node test-api.js --local
     ```
   * **Para probar contra AWS Oficial (Nube)**:
     ```bash
     node test-api.js
     ```

---

## Cómo alternar entre Local (Floci) y AWS Oficial (Nube)

Puedes alternar de forma segura manteniendo aislados ambos entornos de la siguiente manera:

1. **Aislamiento por terminales (Recomendado)**:
   * Las variables de entorno `$env:AWS_ENDPOINT_URL` (en Windows) o `export AWS_ENDPOINT_URL` (en Unix/macOS) solo persisten en la **ventana de terminal activa**.
   * Si abres una **nueva terminal** y ejecutas comandos CDK o AWS CLI estándar (ej: `cdk deploy`), se enviarán automáticamente a tu cuenta **AWS oficial** en la nube usando tus credenciales normales (`~/.aws/credentials`).
   * Si ejecutas comandos usando la envoltura local (ej: `cdklocal deploy` o `awslocal`), o si utilizas una terminal donde configuraste las variables del **Paso 2**, los comandos irán directamente a **Floci**.

2. **Sin conflictos de recursos**:
   * Las bases de datos, contraseñas, configuraciones y ejecuciones de código se mantendrán totalmente separadas. Lo que hagas localmente en Floci no afectará tus tablas o facturación de AWS en la nube.

