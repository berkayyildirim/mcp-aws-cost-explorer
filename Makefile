.PHONY: install build start dev clean

install:
	npm install

build:
	npm run build

start:
	npm start

dev:
	npm run dev

clean:
	rm -rf dist node_modules