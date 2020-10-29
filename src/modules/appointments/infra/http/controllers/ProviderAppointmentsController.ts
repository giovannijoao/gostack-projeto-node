import { Request, Response } from 'express';
import { container } from 'tsyringe';
import ListProviderAppointmentsService from '@modules/appointments/services/ListProviderAppointmentsService';

export default class ProviderAppointmentsController {
  public async index(request: Request, response: Response): Promise<Response> {
    const { id: provider_id } = request.user;
    const { day, month, year } = request.body;
    const listProviderAppointments = container.resolve(
      ListProviderAppointmentsService,
    );
    const availability = await listProviderAppointments.execute({
      provider_id,
      day,
      month,
      year,
    });
    return response.json(availability);
  }
}