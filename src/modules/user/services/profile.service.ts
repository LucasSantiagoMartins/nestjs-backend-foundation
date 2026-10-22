import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Profile } from '../entities/profile.entity';
import { UpdateProfileDto } from '../dtos/update-profile.dto';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
  ) {}

  async createProfile(
    manager: EntityManager,
    fullName: string,
    userId: number,
  ): Promise<Profile> {
    const repo = manager.getRepository(Profile);
    return repo.save(
      repo.create({
        fullName,
        profilePicture: null,
        user: { id: userId } as any,
      }),
    );
  }

  async update(userId: number, data: UpdateProfileDto): Promise<Profile> {
    const profile = await this.findByUserId(userId);
    profile.fullName = data.fullName;
    return this.profileRepository.save(profile);
  }

  async updatePicture(userId: number, fileUrl: string): Promise<Profile> {
    const profile = await this.findByUserId(userId);
    profile.profilePicture = fileUrl;
    return this.profileRepository.save(profile);
  }

  private async findByUserId(userId: number): Promise<Profile> {
    const profile = await this.profileRepository.findOne({
      where: { user: { id: userId } },
    });
    if (!profile) throw new NotFoundException('Perfil não encontrado.');
    return profile;
  }
}
