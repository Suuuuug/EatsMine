import {
  type INestApplication,
  StandardSchemaValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { HttpExceptionFilter } from '../common/http-exception.filter.js';
import { RegionsController } from './regions.controller.js';
import { escapeLike, RegionsService } from './regions.service.js';

describe('RegionsController', () => {
  let app: INestApplication;
  const service = { search: vi.fn(), popular: vi.fn() };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [RegionsController],
      providers: [{ provide: RegionsService, useValue: service }],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new StandardSchemaValidationPipe());
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /regions?q= 는 공백을 제거한 검색어로 조회해 items로 감싼다', async () => {
    service.search.mockResolvedValue([{ code: '41110', name: '수원시' }]);
    const res = await request(app.getHttpServer())
      .get('/regions')
      .query({ q: ' 수원 ' })
      .expect(200);
    expect(service.search).toHaveBeenCalledWith('수원');
    expect(res.body).toEqual({ items: [{ code: '41110', name: '수원시' }] });
  });

  it('검색어가 없으면 400 BAD_REQUEST', async () => {
    const res = await request(app.getHttpServer()).get('/regions').expect(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
    expect(service.search).not.toHaveBeenCalled();
  });

  it('검색어가 20자를 넘으면 400', async () => {
    await request(app.getHttpServer())
      .get('/regions')
      .query({ q: '가'.repeat(21) })
      .expect(400);
  });

  it('GET /regions/popular', async () => {
    service.popular.mockResolvedValue([{ code: '11140' }]);
    const res = await request(app.getHttpServer())
      .get('/regions/popular')
      .expect(200);
    expect(res.body).toEqual({ items: [{ code: '11140' }] });
  });
});

describe('escapeLike', () => {
  it('%, _, \\ 를 이스케이프한다', () => {
    expect(escapeLike('50%_off\\')).toBe('50\\%\\_off\\\\');
  });
});
