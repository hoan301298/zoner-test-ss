import { Test, TestingModule } from '@nestjs/testing';
import { AlarmsController } from './alarms.controller';
import { AlarmsService } from '../../application/alarms.service';
import { CommandBus, QueryBus } from '@nestjs/cqrs';

describe('AlarmsController', () => {
  let controller: AlarmsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AlarmsController],
      providers: [
        AlarmsService,
        // Add mock CommandBus
        {
          provide: CommandBus,
          useValue: { execute: jest.fn() }
        },
        // Add mock QueryBus
        {
          provide: QueryBus,
          useValue: { execute: jest.fn() }
        }
      ],
    }).compile();

    controller = module.get<AlarmsController>(AlarmsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
