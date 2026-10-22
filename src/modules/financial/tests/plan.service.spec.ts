import { PlanService } from '../services/plan.service';

describe('PlanService', () => {
  it('defaults currency to EUR, preserves empty results and propagates persistence errors', async () => {
    const repository = {
      create: jest.fn((data) => data),
      save: jest.fn().mockResolvedValue({
        id: 1,
        name: 'Backend Foundation Plus',
        monthlyPrice: '9.90',
        currency: 'EUR',
        yearlyPrice: null,
        benefits: ['Assistente de IA'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
    };
    const service = new PlanService(repository as any);
    const created = await service.create({
      name: 'Backend Foundation Plus',
      monthlyPrice: 9.9,
      benefits: ['Assistente de IA'],
    });
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ currency: 'EUR', isActive: true }),
    );
    expect(created.monthlyPrice).toBe('9.90');
    expect(await service.findAll()).toEqual([]);
    await expect(service.findOne(999)).rejects.toThrow('Plano não encontrado.');
    repository.save.mockRejectedValueOnce(new Error('database unavailable'));
    await expect(
      service.create({
        name: 'Backend Foundation Plus',
        monthlyPrice: 9.9,
        benefits: [],
      }),
    ).rejects.toThrow('database unavailable');
  });
});
