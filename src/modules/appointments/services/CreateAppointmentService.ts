import { startOfHour, isBefore, getHours, format } from 'date-fns';
import AppError from '@shared/errors/AppError';
import { injectable, inject } from 'tsyringe';
import INotificationsRepository from '@modules/notifications/repositories/INotificationsRepository';
import ICacheProvider from '@shared/container/providers/CacheProvider/models/ICacheProvider';
import Appointment from '../infra/typeorm/entities/Appointment';
import IAppointmentsRepository from '../repositories/IAppointmentsRepository';

interface IRequest {
  provider_id: string;
  user_id: string;
  date: Date;
}
@injectable()
class CreateAppointmentService {
  constructor(
    @inject('AppointmentsRepository')
    private appointmentsRepository: IAppointmentsRepository,
    @inject('NotificationsRepository')
    private notificationsRepository: INotificationsRepository,
    @inject('CacheProvider') private cacheProvider: ICacheProvider,
  ) {}

  public async execute({
    provider_id,
    date,
    user_id,
  }: IRequest): Promise<Appointment> {
    if (user_id === provider_id) {
      throw new AppError("You can't create an appointment with yourself.");
    }
    const appointmentDate = startOfHour(date);
    const appointmentHour = getHours(appointmentDate);
    if (appointmentHour < 8 || appointmentHour > 17) {
      throw new AppError(
        'You can only create an appointment between 8am and 5pm',
      );
    }

    const appointmentAtSameDate = await this.appointmentsRepository.findByDate(
      appointmentDate,
      provider_id,
    );

    if (appointmentAtSameDate) {
      throw new AppError('This appointment is already createed');
    }

    if (isBefore(appointmentDate, Date.now())) {
      throw new AppError("You can't create an appointment on a past date");
    }

    const appointment = await this.appointmentsRepository.create({
      date: appointmentDate,
      provider_id,
      user_id,
    });

    const formatedDate = format(appointment.date, "dd/MM/yyyy 'ás' HH:mm'h'");
    await this.notificationsRepository.create({
      recipient_id: provider_id,
      content: `Novo agendamento para dia ${formatedDate}`,
    });

    const cacheKey = `providers-appointments:${provider_id}:${format(
      appointment.date,
      'yyyy-M-d',
    )}`;
    await this.cacheProvider.invalidate(cacheKey);

    return appointment;
  }
}

export default CreateAppointmentService;
