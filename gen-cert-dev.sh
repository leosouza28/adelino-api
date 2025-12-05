openssl genrsa -out ca.key 2048

openssl req -x509 -new -nodes -key ca.key -sha256 -days 3650 -out ca.crt \
    -subj "/C=BR/ST=SP/O=MinhaCA/CN=MinhaCA"

openssl genrsa -out client.key 2048

openssl req -new -key client.key -out client.csr \
    -subj "/C=BR/ST=SP/O=ClienteTeste/CN=client.local"

openssl x509 -req -in client.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
    -out client.crt -days 365 -sha256