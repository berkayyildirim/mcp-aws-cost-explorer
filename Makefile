.PHONY: install build start dev clean test test-coverage

install:
	npm install

build:
	npm run build

start:
	npm start

dev:
	npm run dev

test:
	npm test

test-coverage:
	npm run test:coverage

clean:
	rm -rf dist node_modules coverage