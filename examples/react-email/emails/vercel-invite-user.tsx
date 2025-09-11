import { setupI18n } from "@jordanmgsoftware/languine-react-email";
import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import * as React from "react";

interface VercelInviteUserEmailProps {
  locale: string;
  username?: string;
  userImage?: string;
  invitedByUsername?: string;
  invitedByEmail?: string;
  teamName?: string;
  teamImage?: string;
  inviteLink?: string;
  inviteFromIp?: string;
  inviteFromLocation?: string;
}

const baseUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "";

export const VercelInviteUserEmail = ({
  locale = "es",
  username = "alanturing",
  userImage = `${baseUrl}/static/vercel-user.png`,
  invitedByUsername = "Alan",
  invitedByEmail = "alan.turing@example.com",
  teamName = "Enigma",
  teamImage = `${baseUrl}/static/vercel-team.png`,
  inviteLink = "https://vercel.com/teams/invite/foo",
  inviteFromIp = "204.13.186.218",
  inviteFromLocation = "São Paulo, Brazil",
}: VercelInviteUserEmailProps) => {
  const i18n = setupI18n(locale);

  return (
    <Html>
      <Head />
      <Preview>{i18n.t("previewText", { invitedByUsername })}</Preview>
      <Tailwind>
        <Body className="bg-white my-auto mx-auto font-sans px-2">
          <Container className="border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] max-w-[465px]">
            <Section className="mt-[32px]">
              <Img
                src={`${baseUrl}/static/vercel-logo.png`}
                width="40"
                height="37"
                alt={i18n.t("logoAlt")}
                className="my-0 mx-auto"
              />
            </Section>
            <Heading className="text-black text-[24px] font-normal text-center p-0 my-[30px] mx-0">
              {i18n.t("joinTeamHeading", {
                teamName: teamName,
                company: "Vercel",
              })}
            </Heading>
            <Text className="text-black text-[14px] leading-[24px]">
              {i18n.t("greeting", { username })}
            </Text>
            <Text className="text-black text-[14px] leading-[24px]">
              {i18n.t("invitationText", {
                invitedByUsername: <strong>{invitedByUsername}</strong>,
                email: (
                  <Link href={`mailto:${invitedByEmail}`}>
                    {invitedByEmail}
                  </Link>
                ),
                teamName: <strong>{teamName}</strong>,
                company: "Vercel",
              })}
            </Text>
            <Section>
              <Row>
                <Column align="right">
                  <Img
                    className="rounded-full"
                    src={userImage}
                    width="64"
                    height="64"
                  />
                </Column>
                <Column align="center">
                  <Img
                    src={`${baseUrl}/static/vercel-arrow.png`}
                    width="12"
                    height="9"
                    alt={i18n.t("invitedToAlt")}
                  />
                </Column>
                <Column align="left">
                  <Img
                    className="rounded-full"
                    src={teamImage}
                    width="64"
                    height="64"
                  />
                </Column>
              </Row>
            </Section>
            <Section className="text-center mt-[32px] mb-[32px]">
              <Button
                className="bg-[#000000] rounded text-white text-[12px] font-semibold no-underline text-center px-5 py-3"
                href={inviteLink}
              >
                {i18n.t("joinTeamButton")}
              </Button>
            </Section>
            <Text className="text-black text-[14px] leading-[24px]">
              {i18n.t("copyUrlText")}{" "}
              <Link href={inviteLink} className="text-blue-600 no-underline">
                {inviteLink}
              </Link>
            </Text>
            <Hr className="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />
            <Text className="text-[#666666] text-[12px] leading-[24px]">
              {i18n.t("footerText", {
                username: <span className="text-black">{username}</span>,
                ip: <span className="text-black">{inviteFromIp}</span>,
                location: (
                  <span className="text-black">{inviteFromLocation}</span>
                ),
              })}
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default VercelInviteUserEmail;
