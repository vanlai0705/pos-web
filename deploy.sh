
if [ -z "$1" ]; then
  echo "❌ Vui lòng truyền tag khi chạy script. Ví dụ: ./deploy.sh v1.0.0"
  exit 1
fi

TAG=$1
IMAGE="registry.gitlab.com/namduong/item-mngt-fe:$TAG"

# Build và push
docker build --platform linux/amd64 -t $IMAGE .
docker push $IMAGE
