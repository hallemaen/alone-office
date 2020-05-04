if [ -z "$1" ]; then
  echo "Provide domain name: $0 example.com"
  exit 1
fi

cat << EOF > "$1.cnf"
[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no
[req_distinguished_name]
C = US
ST = VA
L = SomeCity
O = MyCompany
OU = MyDivision
CN = $1
[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names
[alt_names]
DNS.1 = $1
EOF

openssl req -x509 -nodes -days 3650 -newkey rsa:2048 -sha256 -keyout "$1.key" -out "$1.crt" -config "$1.cnf"
openssl x509 -in "$1.crt" -text -noout