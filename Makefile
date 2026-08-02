build-dev:
	docker build -t registry.gitlab.com/namduong/item-mngt-fe:$(v) --platform linux/amd64 -f Dockerfile .
	docker push registry.gitlab.com/namduong/item-mngt-fe:$(v)

