import { Test, TestingModule } from '@nestjs/testing';
import { AlarmsService } from './alarms.service';
import { CommandBus, QueryBus } from '@nestjs/cqrs';

describe('AlarmsService', () => {
  let service: AlarmsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlarmsService,
        // Add mock CommandBus
        {
          provide: CommandBus,
          useValue: { execute: jest.fn() }
        },
        // Add mock QuerydBus
        {
          provide: QueryBus,
          useValue: { execute: jest.fn() }
        }
      ],
    }).compile();

    service = module.get<AlarmsService>(AlarmsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
