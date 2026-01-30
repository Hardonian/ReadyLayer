using ReadyLayer.SDK.Models;

namespace ReadyLayer.SDK.Services;

/// <summary>
/// Service for policy pack and rule operations.
/// </summary>
public class PolicyService
{
    private readonly ReadyLayerClient _client;

    internal PolicyService(ReadyLayerClient client)
    {
        _client = client;
    }

    /// <summary>
    /// Lists all policy packs.
    /// </summary>
    /// <param name="params">Optional filtering and pagination parameters.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>List of policy packs with pagination information.</returns>
    public async Task<PolicyPackListResponse> ListPacksAsync(
        ListPolicyPacksParams? @params = null,
        CancellationToken cancellationToken = default)
    {
        @params ??= new ListPolicyPacksParams();
        return await _client.GetAsync<PolicyPackListResponse>(
            "policies",
            @params.ToQueryParams(),
            cancellationToken);
    }

    /// <summary>
    /// Gets a specific policy pack by ID.
    /// </summary>
    /// <param name="packId">The policy pack ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The policy pack details.</returns>
    public async Task<PolicyPack> GetPackAsync(
        string packId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(packId))
            throw new ArgumentException("Policy pack ID is required", nameof(packId));

        return await _client.GetAsync<PolicyPack>(
            $"policies/{Uri.EscapeDataString(packId)}",
            cancellationToken: cancellationToken);
    }

    /// <summary>
    /// Creates a new policy pack.
    /// </summary>
    /// <param name="request">The policy pack creation request.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The created policy pack.</returns>
    public async Task<PolicyPack> CreatePackAsync(
        CreatePolicyPackRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request == null)
            throw new ArgumentNullException(nameof(request));

        return await _client.PostAsync<CreatePolicyPackRequest, PolicyPack>(
            "policies",
            request,
            cancellationToken);
    }

    /// <summary>
    /// Updates a policy pack.
    /// </summary>
    /// <param name="packId">The policy pack ID.</param>
    /// <param name="request">The policy pack update request.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The updated policy pack.</returns>
    public async Task<PolicyPack> UpdatePackAsync(
        string packId,
        UpdatePolicyPackRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(packId))
            throw new ArgumentException("Policy pack ID is required", nameof(packId));
        if (request == null)
            throw new ArgumentNullException(nameof(request));

        return await _client.PutAsync<UpdatePolicyPackRequest, PolicyPack>(
            $"policies/{Uri.EscapeDataString(packId)}",
            request,
            cancellationToken);
    }

    /// <summary>
    /// Deletes a policy pack.
    /// </summary>
    /// <param name="packId">The policy pack ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    public async Task DeletePackAsync(
        string packId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(packId))
            throw new ArgumentException("Policy pack ID is required", nameof(packId));

        await _client.DeleteAsync(
            $"policies/{Uri.EscapeDataString(packId)}",
            cancellationToken);
    }

    /// <summary>
    /// Lists all rules in a policy pack.
    /// </summary>
    /// <param name="packId">The policy pack ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>List of policy rules.</returns>
    public async Task<PolicyRuleListResponse> ListRulesAsync(
        string packId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(packId))
            throw new ArgumentException("Policy pack ID is required", nameof(packId));

        return await _client.GetAsync<PolicyRuleListResponse>(
            $"policies/{Uri.EscapeDataString(packId)}/rules",
            cancellationToken: cancellationToken);
    }

    /// <summary>
    /// Adds a rule to a policy pack.
    /// </summary>
    /// <param name="packId">The policy pack ID.</param>
    /// <param name="request">The rule creation request.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The created policy rule.</returns>
    public async Task<PolicyRule> CreateRuleAsync(
        string packId,
        CreatePolicyRuleRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(packId))
            throw new ArgumentException("Policy pack ID is required", nameof(packId));
        if (request == null)
            throw new ArgumentNullException(nameof(request));

        return await _client.PostAsync<CreatePolicyRuleRequest, PolicyRule>(
            $"policies/{Uri.EscapeDataString(packId)}/rules",
            request,
            cancellationToken);
    }

    /// <summary>
    /// Updates a rule in a policy pack.
    /// </summary>
    /// <param name="packId">The policy pack ID.</param>
    /// <param name="ruleId">The rule ID.</param>
    /// <param name="request">The rule update request.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The updated policy rule.</returns>
    public async Task<PolicyRule> UpdateRuleAsync(
        string packId,
        string ruleId,
        UpdatePolicyRuleRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(packId))
            throw new ArgumentException("Policy pack ID is required", nameof(packId));
        if (string.IsNullOrWhiteSpace(ruleId))
            throw new ArgumentException("Rule ID is required", nameof(ruleId));
        if (request == null)
            throw new ArgumentNullException(nameof(request));

        return await _client.PutAsync<UpdatePolicyRuleRequest, PolicyRule>(
            $"policies/{Uri.EscapeDataString(packId)}/rules/{Uri.EscapeDataString(ruleId)}",
            request,
            cancellationToken);
    }

    /// <summary>
    /// Deletes a rule from a policy pack.
    /// </summary>
    /// <param name="packId">The policy pack ID.</param>
    /// <param name="ruleId">The rule ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    public async Task DeleteRuleAsync(
        string packId,
        string ruleId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(packId))
            throw new ArgumentException("Policy pack ID is required", nameof(packId));
        if (string.IsNullOrWhiteSpace(ruleId))
            throw new ArgumentException("Rule ID is required", nameof(ruleId));

        await _client.DeleteAsync(
            $"policies/{Uri.EscapeDataString(packId)}/rules/{Uri.EscapeDataString(ruleId)}",
            cancellationToken);
    }

    /// <summary>
    /// Validates policy YAML/JSON syntax and configuration.
    /// </summary>
    /// <param name="source">The policy source to validate.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The validation result.</returns>
    public async Task<PolicyValidationResult> ValidateAsync(
        string source,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(source))
            throw new ArgumentException("Source is required", nameof(source));

        return await _client.PostAsync<ValidatePolicyRequest, PolicyValidationResult>(
            "policies/validate",
            new ValidatePolicyRequest { Source = source },
            cancellationToken);
    }

    /// <summary>
    /// Lists available policy templates.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>List of policy templates.</returns>
    public async Task<PolicyTemplateListResponse> ListTemplatesAsync(
        CancellationToken cancellationToken = default)
    {
        return await _client.GetAsync<PolicyTemplateListResponse>(
            "policies/templates",
            cancellationToken: cancellationToken);
    }
}
