using VinhKhanh.Mobile.ViewModels;

namespace VinhKhanh.Mobile.Views;

/// <summary>
/// Code-behind for PoiDetailPage — minimal, all logic in PoiDetailViewModel.
/// </summary>
public partial class PoiDetailPage : ContentPage
{
    public PoiDetailPage(PoiDetailViewModel vm)
    {
        InitializeComponent();
        BindingContext = vm;
    }
}
