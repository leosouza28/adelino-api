# Extrair a chave privada (.key) sem criptografia
openssl pkcs12 -in certificado.pfx -nocerts -nodes -out client.key

# Extrair o certificado público (.cer) - formato PEM
openssl pkcs12 -in certificado.pfx -clcerts -nokeys -out client.cer

# Extrair o certificado público (.crt) - formato PEM (mesmo conteúdo do .cer)
openssl pkcs12 -in certificado.pfx -clcerts -nokeys -out client.crt

# Extrair a cadeia de certificação (CA) em .crt
openssl pkcs12 -in certificado.pfx -cacerts -nokeys -chain -out chain-client.crt