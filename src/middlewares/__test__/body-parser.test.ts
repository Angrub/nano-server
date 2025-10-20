import { BodyParser } from '@middlewares';
import { NanoCTX, HttpMethod } from '@core';

describe('BodyParser', () => {
    let bodyParser: BodyParser;
    let next: jest.Mock;

    beforeEach(() => {
        bodyParser = new BodyParser();
        next = jest.fn().mockResolvedValue(undefined);
    });

    const createMockCTX = (method: HttpMethod, contentType?: string, bodyString?: string): NanoCTX => {
        const headers: Record<string, string | string[]> = {};
        if (contentType) {
            headers['content-type'] = contentType;
        }

        return {
            request: {
                method,
                headers,
                body: {},
                params: {},
                query: {},
                path: '/test',
                originalPath: '/test',
                readBodyAsString: jest.fn().mockResolvedValue(bodyString || ''),
                getHeader: jest.fn((name: string) => {
                    const header = headers[name.toLowerCase()];
                    return Array.isArray(header) ? header[0] : header;
                }),
                setHeader: jest.fn((name: string, value: string | string[]) => {
                    headers[name.toLowerCase()] = value;
                }),
                addHeaderValue: jest.fn((name: string, value: string | string[]) => {
                    const key = name.toLowerCase();
                    if (!headers[key]) {
                        headers[key] = value;
                    } else if (Array.isArray(headers[key])) {
                        if (Array.isArray(value)) {
                            (headers[key] as string[]).push(...value);
                        } else {
                            (headers[key] as string[]).push(value);
                        }
                    } else {
                        if (Array.isArray(value)) {
                            headers[key] = [headers[key] as string, ...value];
                        } else {
                            headers[key] = [headers[key] as string, value];
                        }
                    }
                })
            } as any,
            response: {} as any
        };
    };

    describe('JSON parsing', () => {
        test('should parse valid JSON body', async () => {
            const jsonData = { name: 'John', age: 30 };
            const mockCTX = createMockCTX(HttpMethod.POST, 'application/json', JSON.stringify(jsonData));

            await bodyParser.handle(mockCTX, next);

            expect(mockCTX.request.body).toEqual(jsonData);
            expect(mockCTX.request.readBodyAsString).toHaveBeenCalled();
            expect(next).toHaveBeenCalled();
        });

        test('should handle empty JSON body', async () => {
            const mockCTX = createMockCTX(HttpMethod.POST, 'application/json', '');

            await bodyParser.handle(mockCTX, next);

            expect(mockCTX.request.body).toEqual({});
            expect(next).toHaveBeenCalled();
        });

        test('should handle whitespace-only body', async () => {
            const mockCTX = createMockCTX(HttpMethod.POST, 'application/json', '   ');

            await bodyParser.handle(mockCTX, next);

            expect(mockCTX.request.body).toEqual({});
            expect(next).toHaveBeenCalled();
        });

        test('should reject invalid JSON', async () => {
            const mockCTX = createMockCTX(HttpMethod.POST, 'application/json', '{ invalid json }');

            await expect(bodyParser.handle(mockCTX, next)).rejects.toThrow('Invalid JSON in request body');
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('Content-Type handling', () => {
        test('should parse only for application/json content type', async () => {
            const jsonData = { test: 'data' };
            const mockCTX = createMockCTX(HttpMethod.POST, 'application/json', JSON.stringify(jsonData));

            await bodyParser.handle(mockCTX, next);
            expect(mockCTX.request.body).toEqual(jsonData);

            // Reset body and change content-type
            mockCTX.request.body = {};
            mockCTX.request.setHeader('content-type', 'text/plain');
            await bodyParser.handle(mockCTX, next);
            expect(mockCTX.request.body).toEqual({});
        });

        test('should not parse when no content-type header', async () => {
            const mockCTX = createMockCTX(HttpMethod.POST, undefined, '{"test": "data"}');

            await bodyParser.handle(mockCTX, next);

            expect(mockCTX.request.body).toEqual({});
        });
    });

    describe('HTTP method filtering', () => {
        const methodsWithBody = [HttpMethod.POST, HttpMethod.PUT, HttpMethod.PATCH, HttpMethod.DELETE];
        const methodsWithoutBody = [HttpMethod.GET, HttpMethod.HEAD, HttpMethod.OPTIONS];

        methodsWithBody.forEach(method => {
            test(`should parse body for ${method} method`, async () => {
                const jsonData = { test: 'data' };
                const mockCTX = createMockCTX(method, 'application/json', JSON.stringify(jsonData));

                await bodyParser.handle(mockCTX, next);

                expect(mockCTX.request.body).toEqual(jsonData);
            });
        });

        methodsWithoutBody.forEach(method => {
            test(`should not parse body for ${method} method`, async () => {
                const mockCTX = createMockCTX(method, 'application/json', '{"test": "data"}');

                await bodyParser.handle(mockCTX, next);

                expect(mockCTX.request.body).toEqual({});
            });
        });
    });
});