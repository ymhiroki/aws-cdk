import { addToDeadLetterQueueResourcePolicy, bindBaseTargetConfig, singletonEventRole, TargetBaseProps } from './util';
import * as codebuild from '../../aws-codebuild';
import * as events from '../../aws-events';
import * as iam from '../../aws-iam';

/**
 * Customize the CodeBuild Event Target
 */
export interface CodeBuildProjectProps extends TargetBaseProps {

  /**
   * The role to assume before invoking the target
   * (i.e., the codebuild) when the given rule is triggered.
   *
   * @default - a new role will be created
   */
  readonly eventRole?: iam.IRole;

  /**
   * The event to send to CodeBuild
   *
   * This will be the payload for the StartBuild API.
   *
   * @default - the entire EventBridge event
   */
  readonly event?: events.RuleTargetInput;
}

/**
 * Start a CodeBuild build when an Amazon EventBridge rule is triggered.
 */
export class CodeBuildProject implements events.IRuleTarget {
  constructor(
    private readonly project: codebuild.IProject,
    private readonly props: CodeBuildProjectProps = {},
  ) {}

  /**
   * Allows using build projects as event rule targets.
   */
  public bind(_rule: events.IRule, _id?: string): events.RuleTargetConfig {
    if (this.props.deadLetterQueue) {
      addToDeadLetterQueueResourcePolicy(_rule, this.props.deadLetterQueue);
    }

    const role = this.props.eventRole || singletonEventRole(this.project);
    role.addToPrincipalPolicy(new iam.PolicyStatement({
      actions: ['codebuild:StartBuild'],
      resources: [this.project.projectArn],
    }));

    return {
      ...bindBaseTargetConfig(this.props),
      arn: this.project.projectArn,
      role,
      input: this.props.event,
      targetResource: this.project,
    };
  }
}
