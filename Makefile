# pip3 install --user githubrelease

REPO=$(notdir $(PWD))

GITHUB_USER=molobrakos
GITHUB_REPO="$(GITHUB_USER)/$(REPO)"

ZIP=zip -9r --symlinks
BUMPVERSION_CFG=.bumpversion.cfg
VERSION=$(shell grep current_version $(BUMPVERSION_CFG) | cut -d "=" -f 2 | xargs)
ASSET=dist/release-$(VERSION).zip
SHA=$(shell sha1sum -b $(ASSET) | cut -d " " -f 1)
SRC=src/install.xml src/Plugin.pm src/HTML

.PHONY: default upload release

default:
	@echo "Use make release to release"

bumpversion:
	bumpversion patch

$(ASSET): $(SRC)
	mkdir -p dist
	cd src && $(ZIP) ../$@ .

asset: $(ASSET) $(BUMPVERSION_CFG)
	sed -i "s/<sha>.*<\/sha>/<sha>$(SHA)<\/sha>/" public.xml
	git commit -m "Updated SHA1" public.xml

publish: asset
	git push
	github-release $(GITHUB_REPO) create --publish $(VERSION) $(ASSET)

release: bumpversion
	make publish

clean:
	echo

CONTAINER=lms
IMAGE=molobrakos/$(CONTAINER)
DIR=$(HOME)/.docker-$(CONTAINER)
CONFIG_DIR=$(DIR)/config
CACHE_DIR=$(DIR)/cache
LOG_DIR=$(DIR)/logs
MUSIC_DIR=$(DIR)/music

docker:
	mkdir -p $(CONFIG_DIR)
	mkdir -p $(CACHE_DIR)
	mkdir -p $(LOG_DIR)
	mkdir -p $(MUSIC_DIR)
	-docker stop $(CONTAINER)
	-docker rm $(CONTAINER)
	docker pull $(IMAGE)
	docker run -d --name $(CONTAINER) \
        -p 9000:9000 \
        -p 3483:3483 \
        -p 3483:3483/udp \
        -v /etc/localtime:/etc/localtime:ro \
        -v $(CONFIG_DIR):/config \
        -v $(CACHE_DIR):/cache \
        -v $(LOG_DIR):/logs \
        -v $(MUSIC_DIR):/music \
        -v $(HOME)/src/lms-mobileskin/src/HTML/m:/usr/share/squeezeboxserver/HTML/m:ro \
        $(IMAGE) \
        --nobrowsecache
