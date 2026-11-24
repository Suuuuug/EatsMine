import {
  type INestApplication,
  StandardSchemaValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { HttpExceptionFilter } from '../common/http-exception.filter.js';
import { FoodsController } from './foods.controller.js';
import { FoodsService } from './foods.service.js';

describe('FoodsController', () => {
  let app: INestApplication;
  const service = { list: vi.fn(), detail: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [FoodsController],
      providers: [{ provide: FoodsService, useValue: service }],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new StandardSchemaValidationPipe());
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /foods?month=11&q=굴 → 숫자로 바꾼 월과 검색어로 조회', async () => {
    service.list.mockResolvedValue([{ id: 2, name: '굴' }]);
    const res = await request(app.getHttpServer())
      .get('/foods')
      .query({ month: '11', q: ' 굴 ' })
      .expect(200);
    expect(service.list).toHaveBeenCalledWith({ month: 11, q: '굴' });
    expect(res.body).toEqual({ items: [{ id: 2, name: '굴' }] });
  });

  it('GET /foods 필터 없이 전체', async () => {
    service.list.mockResolvedValue([]);
    await request(app.getHttpServer()).get('/foods').expect(200);
    expect(service.list).toHaveBeenCalledWith({});
  });

  it.each(['0', '13', 'abc'])('월이 %s면 400', async (month) => {
    const res = await request(app.getHttpServer())
      .get('/foods')
      .query({ month })
      .expect(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('GET /foods/:id', async () => {
    service.detail.mockResolvedValue({ id: 1, name: '방어회' });
    await request(app.getHttpServer()).get('/foods/1').expect(200);
    expect(service.detail).toHaveBeenCalledWith(1);
  });

  it.each(['abc', '0', '-1'])('GET /foods/%s 는 400', async (id) => {
    await request(app.getHttpServer()).get(`/foods/${id}`).expect(400);
    expect(service.detail).not.toHaveBeenCalled();
  });
});
