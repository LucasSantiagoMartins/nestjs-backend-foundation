import 'reflect-metadata';
import { validate } from 'class-validator';
import { CommunityMessageQueryDto } from '../../dtos/community-message-query.dto';
import { CreateCommunityDto } from '../../dtos/create-community.dto';
import { CreateCommunityMessageDto } from '../../dtos/create-community-message.dto';
import { UpdateCommunityDto } from '../../dtos/update-community.dto';
import { CommunityMessageType } from '../../enums/community-message-type.enum';

function constraintMessages(
  errors: Awaited<ReturnType<typeof validate>>,
): string[] {
  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
}

describe('Community input DTOs', () => {
  it('returns a clear Portuguese message for a missing community name', async () => {
    const dto = Object.assign(new CreateCommunityDto(), {
      slug: 'portugal',
      countryCode: 'PT',
      countryName: 'Portugal',
    });

    expect(constraintMessages(await validate(dto))).toContain(
      'Indica o nome da comunidade.',
    );
  });

  it('returns a clear Portuguese message for an invalid community address', async () => {
    const dto = Object.assign(new UpdateCommunityDto(), { slug: 'Portugal!' });

    expect(constraintMessages(await validate(dto))).toContain(
      'Usa letras minúsculas, números e hífen no endereço.',
    );
  });

  it('requires text content and reports a clear validation message', async () => {
    const dto = Object.assign(new CreateCommunityMessageDto(), {
      type: CommunityMessageType.TEXT,
    });

    expect(constraintMessages(await validate(dto))).toContain(
      'Escreve a mensagem.',
    );
  });

  it('requires a media URL for audio and accepts audio as a message type', async () => {
    const missingUrl = Object.assign(new CreateCommunityMessageDto(), {
      type: CommunityMessageType.AUDIO,
    });
    expect(constraintMessages(await validate(missingUrl))).toContain(
      'Indica o endereço do ficheiro.',
    );

    const validAudio = Object.assign(new CreateCommunityMessageDto(), {
      type: CommunityMessageType.AUDIO,
      mediaUrl: 'https://storage.example/audio.mp3',
    });
    expect(await validate(validAudio)).toHaveLength(0);
  });

  it('reports a Portuguese message when pagination is outside the allowed range', async () => {
    const dto = Object.assign(new CommunityMessageQueryDto(), { limit: 101 });

    expect(constraintMessages(await validate(dto))).toContain(
      'O limite máximo é 100 mensagens.',
    );
  });
});
