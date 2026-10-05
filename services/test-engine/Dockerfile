FROM node:24-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1

RUN apk add --no-cache python3 py3-pip \
  && npm install --global vitest@5.0.1 @vitest/coverage-v8@5.0.1 jest@30.2.0 mocha@11.7.4 c8@10.1.3 tsx@4.20.6 \
  && pip install --no-cache-dir --break-system-packages pytest==8.3.5 pytest-cov==6.0.0 \
  && addgroup --system --gid 10001 readylayer \
  && adduser --system --uid 10001 --ingroup readylayer readylayer

WORKDIR /workspace
USER readylayer
