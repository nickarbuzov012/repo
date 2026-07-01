import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PasswordService } from '../features/auth/services/password.service';
import { UserEntity, UserRole } from '../features/users/entities/user.entity';

@Injectable()
export class AdminInitializer implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminInitializer.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    private readonly configService: ConfigService,
    private readonly passwordService: PasswordService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const login = this.configService.get<string>('ADMIN_LOGIN', 'admin');
    const email = this.configService.get<string>(
      'ADMIN_EMAIL',
      'admin@example.com',
    );
    const password = this.configService.get<string>(
      'ADMIN_PASSWORD',
      'admin123',
    );

    const existingAdmin = await this.usersRepository.findOne({
      where: [{ login }, { email }],
      withDeleted: true,
    });

    if (existingAdmin) {
      if (!existingAdmin.roles.includes(UserRole.Admin)) {
        existingAdmin.roles = [...existingAdmin.roles, UserRole.Admin];
        await this.usersRepository.save(existingAdmin);
        this.logger.log(`Granted admin role: userId=${existingAdmin.id}`);
      }

      return;
    }

    const admin = this.usersRepository.create({
      login,
      email,
      passwordHash: await this.passwordService.hash(password),
      age: Number(this.configService.get<string>('ADMIN_AGE', '30')),
      description: this.configService.get<string>(
        'ADMIN_DESCRIPTION',
        'System administrator',
      ),
      roles: [UserRole.Admin],
    });

    await this.usersRepository.save(admin);
    this.logger.log(`Initialized admin user: userId=${admin.id}`);
  }
}
